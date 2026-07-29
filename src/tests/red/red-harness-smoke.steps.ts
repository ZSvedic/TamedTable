import { Then } from '@cucumber/cucumber';

Then('the red harness placeholder fails on purpose', function () {
  throw new Error('placeholder red test — replaced by real findings');
});
