import 'whatwg-fetch';
import { HexScatter, IHexScatterInput } from './hex-scatter';

class App {
  private readonly scatter: HexScatter;

  constructor(selector: string) {
    this.scatter = new HexScatter(selector);
  }

  public async start() {
    const res = await fetch('github.json')
    const input: IHexScatterInput = await res.json();

    this.scatter.start(input);
  }
}

const app = new App('#github-created-vs-updated');

app.start().then(() => {
}).catch((e) => {
  console.error(e);
});
