import { chromium } from '/home/user/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage();
page.on('console',m=>console.log('PAGE:',m.text()));
page.on('pageerror',e=>console.log('PAGEERR:',e.message));
await page.goto('http://localhost:8731/');
const r = await page.evaluate(() => window.run());
console.log(JSON.stringify(r,null,2));
await browser.close();
