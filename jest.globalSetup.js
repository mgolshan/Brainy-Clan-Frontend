// Pin the device time zone so date tests do not depend on the machine they run on. Toronto has
// DST and is behind UTC, so "late evening" cases fall on the next UTC day. (Tests cannot switch
// it themselves: Jest gives each test file its own copy of `process.env`.)
module.exports = async () => {
  process.env.TZ = 'America/Toronto';
};
