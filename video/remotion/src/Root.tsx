import { Composition } from "remotion";
import { TOTAL, ThamVanVideo } from "./Video";
import { SILENT58_DURATION, ThamVanSilent58 } from "./Silent58";
import { ThamVanGuide120 } from "./Guide120";
import guideTimings from "../public/vo-120/timings.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ThamVanHuongDan120s"
        component={ThamVanGuide120}
        durationInFrames={3600}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ timings: guideTimings }}
        calculateMetadata={({ props }) => ({ durationInFrames: Math.round((props.timings?.total ?? 120) * 30) })}
      />
      <Composition
        id="ThamVanGioiThieu"
        component={ThamVanVideo}
        durationInFrames={TOTAL}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ThamVanKhongLoi58s"
        component={ThamVanSilent58}
        durationInFrames={SILENT58_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
