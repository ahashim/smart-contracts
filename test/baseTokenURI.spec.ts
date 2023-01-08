import { BASE_TOKEN_URI } from '../constants';
import { expect, run } from './setup';

describe('baseTokenURI', () => {
  it('returns the base token URI', async () => {
    const { squeakable } = await run('initialize-contracts');
    expect(await squeakable.baseTokenURI()).to.eq(BASE_TOKEN_URI);
  });
});
