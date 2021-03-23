# 后端框架 —— React


**TL;DR**

这篇文章和SSR没有任何关系，和[React Server Component](https://reactjs.org/blog/2020/12/21/data-fetching-with-react-server-components.html)也没有关系。是字面意思地用React作为后端框架开发`node.js`后端，基于React解耦和管理依赖、控制组件的生命周期、用JSX直观地定义服务器状态。

## 出发点

后端复杂之后，无可避免地需要引入依赖管理的机制，这时候OOP语言里经典的一些设计模式就派上用场了，比如工厂模式、IoC模式。一方面为了解耦，另一方面也能提高开发效率，从无止尽地`new`和传递参数中解放出来。

`node.js`生态已经有了一些IoC实现，使用了decorators语法，比如[InversifyJS](https://github.com/inversify/InversifyJS)(满屏幕的Java味道)。

那么，有没有可能不使用decorators实现IoC呢？这时候我又想到了Angular和React，Angular采用了类似Java DI的模式，而React却完全没有使用类似的模式，为何感觉同样拥有优雅的依赖管理？

```ts
const Theme = createContext({})
const Router = createContext({})

// Provider.js
function Provider (props){
  return (
    <Theme.Provider value={{ primaryColor: "#1d7dfa" }}>
        <Router.Provider value={{ currentPathname: "/github" }}>
          {props.children}
        </Router.Provider>
    </Theme.Provider>
  )
}

// Consumer.js
function Consumer (){
  const theme = useContext(Theme)
  const router = useContext(Router)
}
```

Context API分离了Provider和Consumer，使用一个hook（useContext）将Provider的value「注入」到Consumer中。使得Consumer**没有在内部创建Provider**实例的时候得到了Provider的value，这...不就是**控制反转**吗...


![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4c8f86cc6e7f48b599301d3bac3e600c~tplv-k3u1fbpfcp-watermark.image)

## 下一步
但是，众所周知，React是一个UI框架，是通过虚拟DOM来实现界面的。React的JSX使用的`div`，`span`这些关键词都对应着一个个的网页元素。这些年随着SSR的发展，也不乏开发者们在node.js服务端直接用ReactDOMServer去渲染出html，取代传统的模板....扯远了，既然文章的目的是实现后端，那么光搞个SSR没啥意义，至少要渲染出JSON来。

既然拥有声明式的JSX语法，那么用JSX声明一个JSON自然就是最直接的选择。这让我想到了GraphQL，GraphQL通过定义schema和resolver，能够输出一个相当自由的JSON。


**那么...**

**那么我直接用GraphQL不就得了???**


![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c7d1d45269ab45f283bb3b9ff25d61eb~tplv-k3u1fbpfcp-watermark.image)

冷静一想，如果我是想用JSX声明一个JSON，其实并不能达到作为后端框架的目的，除了JSON之外的其他**Response**（比如text, arrayBuffer）也没那么容易用JSX声明。

转变思路，去声明一个**ServerState**怎么样呢？服务器上的不同组件经过JSX的嵌套，共同构成一个服务器状态。嵌套关系就是依赖关系，而Request和Response可以交给抽象成Server的单个组件去接收和处理。

```ts

<ConfigProvider>
    <DatabaseProvider>
        <ThirdPartyService>
            <SessionProvider>
                <Server onRequest={handleRequest}>
            </SessionProvider>
        </ThirdPartyService>
    </DatabaseProvider>
</ConfigProvider>
```

## 抠腚开始

其实有了上面这个结构之后，Coding是非常顺利的，Provider写起来都是固定的模式：

```ts
// Database.tsx
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


```

而Server相对特殊一点

```ts
// Server.tsx
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



```

再写下handleRequest

```
const handleRequest = useCallback((event) => {
  event.response.end("hello 🐈")
}, [])
```


## 最后一步

那么，怎么跑起来呢？

借助[react-reconciler](https://github.com/facebook/react/tree/master/packages/react-reconciler)实现一个CustomRenderer是一个好方法，但是考虑到其实整个tree最终只是返回的一个null而已，可以先用简单的方法实现：

```ts

import ReactDOM from 'react-dom'
import { JSDOM, DOMWindow } from 'jsdom'
import { App } from './App'

// make ts happy
declare const global: NodeJS.Global & { window: DOMWindow; document: Document }

const dom = new JSDOM(`<div id="app"></div>`)
/**
 * ReactDOM会访问window对象，所以注册到全局。
 */
global.window = dom.window
global.document = window.document

/**
 * 之所以用#app而不直接用document.body的原因是什么呢？
 */
ReactDOM.render(<App></App>, document.querySelector('#app'))

```

（jsdom真是个好东西呀）


![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c9504585d13d4f2c9e8fa2ca02281bd2~tplv-k3u1fbpfcp-watermark.image)



效果：

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e198ff7823fb4d86aedd370aaa547707~tplv-k3u1fbpfcp-watermark.image)

以上代码可以直接从[heineiuo/react-as-backend-framework](https://github.com/heineiuo/react-as-backend-framework) 拿到，欢迎尝试。


## 感想

React在很多人眼里不是一个完整的UI框架，而它在我眼里，甚至不是一个UI框架，而是一个「声明状态的框架」。所有的JSX构成的一个大树只是一个状态，这个状态可能渲染到DOM，也可能渲染到Native，也可能你和UI毫无关系，比如上面的代码里几乎全部由React Context构成，最终只返回了一个null，那这跟UI是没有丝毫关系的。


> **Learn Once, Write Anywhere**


这次只是实现了一个hello world，体现了基于React的IoC机制，还缺少一些常用的组件，比如路由。下篇文章实现下路由。