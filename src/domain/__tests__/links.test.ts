import { describe, expect, it } from '@jest/globals';

import { withoutMalformedQuery } from '../links';

describe('withoutMalformedQuery', () => {
  it('leaves a link with a clean query, or none, untouched', () => {
    expect(withoutMalformedQuery('exp://127.0.0.1:8081/--/fund/122639')).toBe('exp://127.0.0.1:8081/--/fund/122639');
    const named = 'exp://127.0.0.1:8081/--/fund/122639?name=Parag%20Parikh+Flexi%20Cap&x=%E0%A4%A8';
    expect(withoutMalformedQuery(named)).toBe(named);
  });

  it('drops the whole query when any key or value is malformed percent-encoding', () => {
    expect(withoutMalformedQuery('exp://127.0.0.1:8081/--/fund/122639?name=%E0%A4%A')).toBe(
      'exp://127.0.0.1:8081/--/fund/122639',
    );
    expect(withoutMalformedQuery('/fund/122639?ok=1&%ZZ=2')).toBe('/fund/122639');
    expect(withoutMalformedQuery('/compare?a=122639&b=%')).toBe('/compare');
  });

  it('keeps a fragment after a dropped query', () => {
    expect(withoutMalformedQuery('/fund/122639?name=%E0#top')).toBe('/fund/122639#top');
  });
});
