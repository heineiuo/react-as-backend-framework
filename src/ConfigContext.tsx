import { FC, createContext } from "react";

type ConfigState = {
  port: number;
  dbOptions: any;
};

export const ConfigContext = createContext({} as ConfigState);

export const ConfigProvider: FC = (props) => {
  return (
    <ConfigContext.Provider
      value={{
        port: 8080,
        dbOptions: {
          url: process.env.DB_URL,
        },
      }}
    >
      {props.children}
    </ConfigContext.Provider>
  );
};
