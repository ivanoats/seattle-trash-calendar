import { z } from "zod";
import {
  CalendarError,
  services,
  normalizeCollections,
} from "../domain/calendar";
import type { ScheduleProvider } from "../application/ports";
const BASE = "https://myutilities.seattle.gov/rest";
const addressSchema = z.object({
  address: z.array(
    z.object({
      premCode: z.string().min(1),
      addressLine1: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      garbageInactiveInd: z
        .union([z.boolean(), z.number(), z.string()])
        .nullable()
        .optional(),
    }),
  ),
});
const accountSchema = z.object({
  account: z.object({ accountNumber: z.string(), companyCd: z.string() }),
});
const summarySchema = z.object({
  accountContext: z.object({ personId: z.string(), companyCd: z.string() }),
  accountSummaryType: z.object({
    swServices: z.array(
      z.object({
        services: z.array(
          z.object({
            servicePointId: z.string(),
            description: z.enum(services),
          }),
        ),
      }),
    ),
  }),
});
const calendarSchema = z.object({
  calendar: z.record(z.string(), z.array(z.string())),
});
const tokenSchema = z.object({ access_token: z.string().min(1) });
export class SeattleProvider implements ScheduleProvider {
  constructor(
    private readonly fetcher: typeof fetch = (...args) =>
      globalThis.fetch(...args),
    private readonly now = () => new Date(),
  ) {}
  private async post(
    path: string,
    body: unknown,
    schema: z.ZodType,
    token?: string,
  ) {
    try {
      const response = await this.fetcher(BASE + path, {
        method: "POST",
        headers: {
          "Content-Type":
            path === "/auth/guest"
              ? "application/x-www-form-urlencoded"
              : "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: path === "/auth/guest" ? "" : JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
        redirect: "manual",
      });
      if (!response.ok) throw new Error("Upstream request failed");
      const data: unknown = await response.json();
      const envelope = z
        .object({ statusCode: z.union([z.string(), z.number()]).optional() })
        .passthrough()
        .parse(data);
      if (
        envelope.statusCode !== undefined &&
        String(envelope.statusCode) !== "200"
      )
        throw new Error("Upstream rejected request");
      return schema.parse(data);
    } catch {
      throw new CalendarError(
        "Seattle’s lookup is unavailable or returned an unexpected response. Please try again or use the official lookup.",
        502,
      );
    }
  }
  async search(query: string) {
    const data = addressSchema.parse(
      await this.post(
        "/serviceorder/findaddress",
        { address: { addressLine1: query, city: "", zip: "" } },
        addressSchema,
      ),
    );
    return data.address
      .filter(
        (a) => ![true, 1, "1", "true"].includes(a.garbageInactiveInd ?? false),
      )
      .slice(0, 30)
      .map((a) => ({
        id: a.premCode,
        label: [a.addressLine1, a.city, a.state, a.zip].join(", "),
      }));
  }
  async schedule(premise: string) {
    const { account } = accountSchema.parse(
      await this.post(
        "/serviceorder/findAccount",
        { address: { premCode: premise } },
        accountSchema,
      ),
    );
    if (account.companyCd !== "SPU")
      throw new CalendarError(
        "This address does not have an SPU collection schedule.",
        404,
      );
    const { access_token: token } = tokenSchema.parse(
      await this.post("/auth/guest", null, tokenSchema),
    );
    const summary = summarySchema.parse(
      await this.post(
        "/guest/swsummary",
        {
          customerId: "guest",
          accountContext: {
            accountNumber: account.accountNumber,
            personId: null,
            companyCd: null,
            serviceAddress: null,
          },
        },
        summarySchema,
        token,
      ),
    );
    const points = summary.accountSummaryType.swServices.flatMap(
      (s) => s.services,
    );
    if (!points.length)
      throw new CalendarError(
        "No collection services were found at this address.",
        404,
      );
    const data = calendarSchema.parse(
      await this.post(
        "/solidwastecalendar",
        {
          customerId: "guest",
          accountContext: {
            accountNumber: account.accountNumber,
            ...summary.accountContext,
          },
          servicePoints: points.map((p) => p.servicePointId),
        },
        calendarSchema,
        token,
      ),
    );
    const collections = points.flatMap((point) => {
      const dates = data.calendar[point.servicePointId];
      if (!dates)
        throw new CalendarError(
          "Seattle returned an incomplete collection schedule. Please try again.",
          502,
        );
      return dates.map((value) => {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
        if (!m)
          throw new CalendarError(
            "Seattle returned an invalid collection date.",
            502,
          );
        return { date: `${m[3]}-${m[1]}-${m[2]}`, service: point.description };
      });
    });
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(premise),
    );
    const calendarId = Array.from(new Uint8Array(digest), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join("");
    return {
      calendarId,
      collections: normalizeCollections(collections),
      fetchedAt: this.now().toISOString(),
    };
  }
}
