const { normalizeYouTubeUrl } = require('../utils/youtube');

function testYouTube() {
  console.log('▶️ Testing YouTube link validation...');
  const ID = 'dQw4w9WgXcQ';
  const good = `https://www.youtube.com/watch?v=${ID}`;

  const accepted = [
    [`https://www.youtube.com/watch?v=${ID}`, good],
    [`youtube.com/watch?v=${ID}`, good],
    [`  https://m.youtube.com/watch?v=${ID}&feature=share  `, good],
    [`https://youtu.be/${ID}`, good],
    [`https://youtu.be/${ID}?si=abc123`, good],
    [`https://www.youtube.com/shorts/${ID}`, good],
    [`https://www.youtube.com/embed/${ID}`, good],
    [`https://www.youtube.com/live/${ID}?feature=share`, good],
    [`https://youtu.be/${ID}?t=90`, `${good}&t=90s`],
    ['https://www.youtube.com/playlist?list=PLabcdefghij1234', 'https://www.youtube.com/playlist?list=PLabcdefghij1234']
  ];
  accepted.forEach(([input, expected]) => {
    const out = normalizeYouTubeUrl(input);
    if (out !== expected) throw new Error(`YouTube link "${input}" -> "${out}", expected "${expected}"`);
  });

  const rejected = [
    '', '   ', null, undefined, 'hello', 'https://example.com/watch?v=' + ID,
    'https://youtube.com.evil.com/watch?v=' + ID, 'https://evil.com/?u=https://youtu.be/' + ID,
    'javascript:alert(1)', 'ftp://youtu.be/' + ID, 'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/', 'https://www.youtube.com/@somechannel'
  ];
  rejected.forEach(input => {
    const out = normalizeYouTubeUrl(input);
    if (out !== null) throw new Error(`"${input}" should be rejected but gave "${out}"`);
  });
  console.log('✔ YouTube link tests passed successfully.');
}

module.exports = { testYouTube };
