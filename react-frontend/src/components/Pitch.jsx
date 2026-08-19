import { pitchLines } from "../utils";

export default function Pitch({ children, style = {} }) {
  return (
    <svg
      className="pitch"
      viewBox="0 0 120 80"
      style={style}
      dangerouslySetInnerHTML={{
        __html: `<rect x="0" y="0" width="120" height="80" fill="#14361f"/>${pitchLines()}${
          children || ""
        }`,
      }}
    />
  );
}
