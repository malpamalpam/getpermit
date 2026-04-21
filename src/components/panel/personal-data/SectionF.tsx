import { inputBase, labelBase } from "./constants";
import { OccupationSearch } from "./OccupationSearch";

const CONTRACT_TYPES = ["EMPLOYMENT", "MANDATE", "SPECIFIC_TASK", "MANAGERIAL"] as const;

interface Props {
  values: Record<string, string | boolean | null>;
  onChange: (field: string, value: string | boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function SectionF({ values, onChange, t }: Props) {
  const v = (key: string) => (values[key] as string) ?? "";
  const vBool = (key: string): boolean | undefined =>
    values[key] === true || values[key] === false
      ? (values[key] as boolean)
      : undefined;

  return (
    <div className="space-y-5">
      <div>
        <label className={labelBase}>{t("employerName")}</label>
        <input type="text" value={v("employerName")} onChange={(e) => onChange("employerName", e.target.value)} className={inputBase} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("employerStreet")}</label>
          <input type="text" value={v("employerStreet")} onChange={(e) => onChange("employerStreet", e.target.value)} className={inputBase} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>{t("employerHouseNumber")}</label>
            <input type="text" value={v("employerHouseNumber")} onChange={(e) => onChange("employerHouseNumber", e.target.value)} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>{t("employerApartmentNumber")}</label>
            <input type="text" value={v("employerApartmentNumber")} onChange={(e) => onChange("employerApartmentNumber", e.target.value)} className={inputBase} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className={labelBase}>{t("employerPostalCode")}</label>
          <input type="text" placeholder="00-000" value={v("employerPostalCode")} onChange={(e) => onChange("employerPostalCode", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("employerCity")}</label>
          <input type="text" value={v("employerCity")} onChange={(e) => onChange("employerCity", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("employerPhone")}</label>
          <input type="tel" value={v("employerPhone")} onChange={(e) => onChange("employerPhone", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("employerEmail")}</label>
          <input type="email" value={v("employerEmail")} onChange={(e) => onChange("employerEmail", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("contractType")}</label>
        <select value={v("contractType")} onChange={(e) => onChange("contractType", e.target.value)} className={inputBase}>
          <option value="">—</option>
          {CONTRACT_TYPES.map((ct) => (
            <option key={ct} value={ct}>{t(`options.contractType.${ct}`)}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className={labelBase}>{t("contractFrom")}</label>
          <input type="date" value={v("contractFrom")} onChange={(e) => onChange("contractFrom", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("contractTo")}</label>
          <input
            type="date"
            value={v("contractTo")}
            onChange={(e) => onChange("contractTo", e.target.value)}
            disabled={vBool("contractIndefinite") === true}
            className={inputBase}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-primary">
            <input
              type="checkbox"
              checked={vBool("contractIndefinite") === true}
              onChange={(e) => {
                onChange("contractIndefinite", e.target.checked);
                if (e.target.checked) onChange("contractTo", "");
              }}
              className="h-4 w-4 rounded border-primary/30 text-accent focus:ring-accent/20"
            />
            {t("contractIndefinite")}
          </label>
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("salary")}</label>
        <input type="text" value={v("salary")} onChange={(e) => onChange("salary", e.target.value)} placeholder={t("salaryHint")} className={inputBase} />
      </div>

      <OccupationSearch
        value={v("kzisCode")}
        onChange={(val) => onChange("kzisCode", val)}
        label={t("kzisCode")}
        placeholder={t("kzisCodeHint")}
      />

      <div>
        <label className={labelBase}>{t("jobTitle")}</label>
        <input type="text" value={v("jobTitle")} onChange={(e) => onChange("jobTitle", e.target.value)} placeholder={t("jobTitleHint")} className={inputBase} />
      </div>

      {v("contractType") === "SPECIFIC_TASK" && (
        <div>
          <label className={labelBase}>{t("workSubject")}</label>
          <input type="text" value={v("workSubject")} onChange={(e) => onChange("workSubject", e.target.value)} placeholder={t("workSubjectHint")} className={inputBase} />
        </div>
      )}
    </div>
  );
}
