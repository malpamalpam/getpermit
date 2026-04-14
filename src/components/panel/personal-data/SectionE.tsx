import {
  inputBase,
  labelBase,
  PURPOSE_OF_STAY_OPTIONS,
  RESIDENCE_TITLE_OPTIONS,
  HANDLING_OFFICES,
} from "./constants";
import { OccupationSearch } from "./OccupationSearch";

interface Props {
  values: Record<string, string | boolean | null>;
  onChange: (field: string, value: string | boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function SectionE({ values, onChange, t }: Props) {
  const v = (key: string) => (values[key] as string) ?? "";
  const vBool = (key: string): boolean | undefined =>
    values[key] === true || values[key] === false
      ? (values[key] as boolean)
      : undefined;

  const boolSelect = (field: string, required: boolean) => (
    <select
      value={vBool(field) === true ? "true" : vBool(field) === false ? "false" : ""}
      onChange={(e) => {
        if (e.target.value === "") onChange(field, "");
        else onChange(field, e.target.value === "true");
      }}
      className={inputBase}
    >
      <option value="">—</option>
      <option value="true">{t("yes")}</option>
      <option value="false">{t("no")}</option>
    </select>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("firstEntryDate")} *</label>
          <input type="date" value={v("firstEntryDate")} onChange={(e) => onChange("firstEntryDate", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("lastEntryDate")} *</label>
          <input type="date" value={v("lastEntryDate")} onChange={(e) => onChange("lastEntryDate", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("purposeOfStay")} *</label>
          <select value={v("purposeOfStay")} onChange={(e) => onChange("purposeOfStay", e.target.value)} className={inputBase}>
            <option value="">—</option>
            {PURPOSE_OF_STAY_OPTIONS.map((p) => (
              <option key={p} value={p}>{t(`options.purposeOfStay.${p}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelBase}>{t("currentResidenceTitle")} *</label>
          <select value={v("currentResidenceTitle")} onChange={(e) => onChange("currentResidenceTitle", e.target.value)} className={inputBase}>
            <option value="">—</option>
            {RESIDENCE_TITLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{t(`options.residenceTitle.${r}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("pendingProceedings")} *</label>
          {boolSelect("pendingProceedings", true)}
        </div>
        <div>
          <label className={labelBase}>{t("caseNumberAtOffice")}</label>
          <input type="text" value={v("caseNumberAtOffice")} onChange={(e) => onChange("caseNumberAtOffice", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("handlingOffice")}</label>
        <select value={v("handlingOffice")} onChange={(e) => onChange("handlingOffice", e.target.value)} className={inputBase}>
          <option value="">—</option>
          {HANDLING_OFFICES.map((o) => (
            <option key={o} value={o}>{t(`options.handlingOffice.${o}`)}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("criminalRecord")} *</label>
          {boolSelect("criminalRecord", true)}
        </div>
        <div>
          <label className={labelBase}>{t("deportationProceedings")} *</label>
          {boolSelect("deportationProceedings", true)}
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("plannedStayDuration")}</label>
        <input type="text" value={v("plannedStayDuration")} onChange={(e) => onChange("plannedStayDuration", e.target.value)} placeholder={t("plannedStayDurationHint")} className={inputBase} />
      </div>

      <div>
        <OccupationSearch
          value={v("occupation")}
          onChange={(val) => onChange("occupation", val)}
          label={t("occupation")}
          placeholder={t("occupationHint")}
        />
      </div>
    </div>
  );
}
