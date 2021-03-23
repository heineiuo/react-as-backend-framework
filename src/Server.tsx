import http from "http";
import { FC, useContext, useEffect, useRef } from "react";
import { ConfigContext } from "./ConfigContext";
import { DatabaseContext } from "./DatabaseContext";

/**
 * <HTTPServer port={8080} onRequest={requestHandler} key="KEY">
 *
 * Won't update when `port` change.
 * Change `key` prop to close/update server.
 * @param props
 */
export const Server: FC = (props) => {
  const ref = useRef<any>();
  const config = useContext(ConfigContext);
  const { db } = useContext(DatabaseContext);
  const refPort = useRef<number>(config.port);

  useEffect(() => {
    ref.current = async (event: any) => {
      const result = await db.query<{ count: number }>();
      event.response.end(
        `<!DOCTYPE html><meta charset="utf8"/>hello ${Array.from({
          length: result.count,
        })
          .fill("🐈")
          .join("")} `
      );
    };
  }, [db]);

  useEffect(() => {
    const httpServer = http.createServer((req, res) => {
      if (ref.current) {
        ref.current({
          request: req,
          response: res,
        });
      }
    });

    httpServer.listen(refPort.current, () => {
      console.log(`HTTP server listening on port ${refPort.current}`);
    });

    return (): void => {
      httpServer.close();
    };
  }, []);

  return null;
};
