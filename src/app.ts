import 'whatwg-fetch';
import { UserScatter } from './user-scatter';
import { KeyPlot } from './key-plot';

class App {
  private readonly users: UserScatter;
  private readonly key: KeyPlot;

  constructor() {
    this.users = new UserScatter('#github-user-scatter');
    this.key = new KeyPlot('#github-key-plot');
  }

  public async start() {
    await Promise.all([
      this.users.start(),
      this.key.start(),
    ]);
  }
}

const app = new App();

app.start().then(() => {
}).catch((e) => {
  console.error(e);
});
