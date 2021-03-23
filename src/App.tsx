import { FC } from "react";
import { Server } from "./Server";
import { ConfigProvider } from "./ConfigContext";
import { DatabaseProvider } from "./DatabaseContext";

const App: FC = () => {
  return (
    <ConfigProvider>
      <DatabaseProvider>
        <Server></Server>
      </DatabaseProvider>
    </ConfigProvider>
  );
};

export { App };
