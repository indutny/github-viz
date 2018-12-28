import 'whatwg-fetch';
import { UserScatter } from './user-scatter';
import { Area } from './area';

class App {
  private readonly users: UserScatter;
  private readonly key: Area;

  constructor() {
    this.users = new UserScatter('#github-user-scatter');
    this.key = new Area('#github-key-plot', {
      maxKinds: 5,
      xTitle: 'last profile update',
      yTitle: 'percent of keys created',
    });
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
