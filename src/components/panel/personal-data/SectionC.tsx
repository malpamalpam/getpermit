import { inputBase, labelBase, VOIVODESHIPS } from "./constants";
import { CitySearch } from "./AddressSearch";

interface Props {
  values: Record<string, string | boolean | null>;
  onChange: (field: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function SectionC({ values, onChange, t }: Props) {
  const v = (key: string) => (values[key] as string) ?? "";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <CitySearch
          value={v("city")}
          onChange={(val) => onChange("city", val)}
          label={t("city")}
          required
          placeholder={t("cityHint")}
        />
        <div>
          <label className={labelBase}>{t("voivodeship")} *</label>
          <select value={v("voivodeship")} onChange={(e) => onChange("voivodeship", e.target.value)} className={inputBase}>
            <option value="">—</option>
            {VOIVODESHIPS.map((w) => (
              <option key={w} value={w}>{t(`options.voivodeship.${w}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("street")} *</label>
        <input
          type="text"
          value={v("street")}
          onChange={(e) => onChange("street", e.target.value)}
          placeholder={t("streetHint")}
          className={inputBase}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelBase}>{t("houseNumber")} *</label>
          <input type="text" value={v("houseNumber")} onChange={(e) => onChange("houseNumber", e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className={labelBase}>{t("apartmentNumber")}</label>
          <input type="text" value={v("apartmentNumber")} onChange={(e) => onChange("apartmentNumber", e.target.value)} className={inputBase} />
        </div>
      </div>

      <div>
        <label className={labelBase}>{t("postalCode")} *</label>
        <input type="text" placeholder="00-000" value={v("postalCode")} onChange={(e) => onChange("postalCode", e.target.value)} className={inputBase} />
      </div>

      <div>
        <label className={labelBase}>{t("registrationAddress")}</label>
        <input type="text" value={v("registrationAddress")} onChange={(e) => onChange("registrationAddress", e.target.value)} placeholder={t("registrationAddressHint")} className={inputBase} />
      </div>

      <div>
        <label className={labelBase}>{t("correspondenceAddress")}</label>
        <input type="text" value={v("correspondenceAddress")} onChange={(e) => onChange("correspondenceAddress", e.target.value)} placeholder={t("correspondenceAddressHint")} className={inputBase} />
      </div>
    </div>
  );
}
