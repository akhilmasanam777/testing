import { toTitleCase } from "@/utils/text";
import type { JSX, SVGProps } from "react";

type OverviewCard = {
  label: string;
  data: {
    value: string | number | JSX.Element;
  };
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};


export function OverviewCard({ label, data, Icon }: OverviewCard) {
  return (
    <div className="Card-div flex-1">

      <div className="Executive-dashboard-card-header">
        <Icon />

        <h2 className="Executive-dashboard-card-title">
          {toTitleCase(label)}
        </h2>

      </div>

      <div className="Executive-dashboard-card-value">
        {data.value}
      </div>

    </div>
  );
}



type PropsTypeGpNamesCard = {
  label: string;
  value: number | string| JSX.Element;
  textColor?: string;
  valueColor?: string;
};

export function GpNamesCard({
  label,
  value,
  textColor,
  valueColor,
}: PropsTypeGpNamesCard) {
  return (
    <div
      className="Card-div"
    >
      {/* LABEL */}
      <h2 className={`text-lg font-medium ${textColor}`}>
        {label}
      </h2>

      {/* VALUE */}
      <div className={`text-3xl font-bold mt-2 ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}


type PropsTypeBoqCards = {
  label: string;
  value: number | string | JSX.Element;
};

export function BoqCards({ label, value }: PropsTypeBoqCards) {
  return (
    <div className="Card-div">
      <h2 className="card-value">{value}</h2>
      <div className="card-label">{label}</div>
    </div>
  );
}