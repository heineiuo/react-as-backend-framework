import { FC, useState, useContext, createContext } from "react";
import { ConfigContext } from "./ConfigContext";

class MockDatabaseClient {
  options: any;
  constructor(options: any) {
    this.options = options;
  }

  async query<T = any>(): Promise<T> {
    const result = {
      count: Math.random() < 0.5 ? 1 : 2,
    } as unknown;
    return result as T;
  }
}

type DatabaseState = {
  db: MockDatabaseClient;
};

export const DatabaseContext = createContext({} as DatabaseState);

/**
 * 子组件通过useContext(DatabaseContext)得到db。
 */
export const DatabaseProvider: FC = (props) => {
  const config = useContext(ConfigContext);
  const [db] = useState(new MockDatabaseClient(config.dbOptions));
  return (
    <DatabaseContext.Provider value={{ db }}>
      {props.children}
    </DatabaseContext.Provider>
  );
};
