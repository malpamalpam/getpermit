import { inputBase, labelBase } from "./constants";

interface Props {
  values: Record<string, string | boolean | null>;
  onChange: (field: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function SectionG({ values, onChange, t }: Props) {
  const v = (key: string) => (values[key] as string) ?? "";

  return (
    <div className="space-y-5">
      <div>
        <label className={labelBase}>{t("familyMembersInPoland")}</label>
        <textarea value={v("familyMembersInPoland")} onChange={(e) => onChange("familyMembersInPoland", e.target.value)} className={inputBase} rows={3} placeholder={t("familyMembersInPolandHint")} />
      </div>

      <div>
        <label className={labelBase}>{t("lastEntryDetails")}</label>
        <textarea value={v("lastEntryDetails")} onChange={(e) => onChange("lastEntryDetails", e.target.value)} className={inputBase} rows={2} placeholder={t("lastEntryDetailsHint")} />
      </div>

      <div>
        <label className={labelBase}>{t("previousVisitsPoland")}</label>
        <textarea value={v("previousVisitsPoland")} onChange={(e) => onChange("previousVisitsPoland", e.target.value)} className={inputBase} rows={2} />
      </div>

      <div>
        <label className={labelBase}>{t("travelsOutsidePoland")}</label>
        <textarea value={v("travelsOutsidePoland")} onChange={(e) => onChange("travelsOutsidePoland", e.target.value)} className={inputBase} rows={3} placeholder={t("travelsOutsidePolandHint")} />
      </div>

      <div>
        <label className={labelBase}>{t("addressCountryOfOrigin")}</label>
        <textarea value={v("addressCountryOfOrigin")} onChange={(e) => onChange("addressCountryOfOrigin", e.target.value)} className={inputBase} rows={2} />
      </div>

      <div>
        <label className={labelBase}>{t("previousAddressesPoland")}</label>
        <textarea value={v("previousAddressesPoland")} onChange={(e) => onChange("previousAddressesPoland", e.target.value)} className={inputBase} rows={2} />
      </div>
    </div>
  );
}
