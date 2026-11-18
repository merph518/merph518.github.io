# merph518.github.io

The passkey relying party for the family TV's app guard (merph518/sony-tv #11, #12). The only file that matters is
`.well-known/assetlinks.json`: it tells phones that the TV app `io.github.merph518.tvguard`, signed with that key, may
use passkeys for this domain. It holds no secrets.

Don't rename this repository or move the domain: every registered passkey is tied to `merph518.github.io`.
