import { Shell } from "./Shell.tsx";

export interface AppProps {
  readonly wsUrl?: string;
  readonly initialDeviceModel?: string;
}

export const App = ({
  wsUrl = "ws://127.0.0.1:52937",
  initialDeviceModel = "mk2",
}: AppProps = {}): React.ReactElement => {
  return <Shell wsUrl={wsUrl} initialDeviceModel={initialDeviceModel} />;
};
