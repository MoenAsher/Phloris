import { Link2, Search, ExternalLink, Smartphone, AlertTriangle } from 'lucide-react'

export function LinkRecognition() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        URLs are the primary delivery mechanism for phishing. These practical techniques
        reduce the chance of acting on a malicious link — no special software required.
      </p>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Search className="h-4 w-4 text-blue-500" />
          Hover before you click
        </h2>
        <p className="text-sm text-muted-foreground">
          On desktop, hovering over a link shows the real destination in the browser's
          status bar. Always check that it matches what the visible text implies before
          clicking. On mobile, long-press the link to preview the destination without
          navigating to it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Link2 className="h-4 w-4 text-amber-500" />
          Read the domain carefully
        </h2>
        <p className="text-sm text-muted-foreground">
          Focus on the part immediately before the final dot and top-level domain (e.g.{' '}
          <code className="rounded bg-muted px-1 text-xs">.com</code>,{' '}
          <code className="rounded bg-muted px-1 text-xs">.co.uk</code>). That is the
          real domain. Everything before it is a subdomain controlled by whoever owns
          the real domain.
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span>
              <code className="rounded bg-muted px-1 text-xs">
                paypal.com.evil.com
              </code>{' '}
              — real domain is <strong>evil.com</strong>, not paypal.com
            </span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span>
              <code className="rounded bg-muted px-1 text-xs">micros0ft.com</code> —
              zero substituted for the letter o
            </span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span>
              <code className="rounded bg-muted px-1 text-xs">paypa1.com</code> — digit
              1 substituted for the letter l
            </span>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          Shortened and masked links
        </h2>
        <p className="text-sm text-muted-foreground">
          Shortened URLs (bit.ly, t.co, etc.) hide the real destination. Expand them
          before trusting by pasting into a URL-expander service, or check the
          destination with one of the tools below before clicking.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ExternalLink className="h-4 w-4 text-emerald-500" />
          Check suspicious links externally
        </h2>
        <p className="text-sm text-muted-foreground">
          For any link that raises doubt, reputable third-party tools can analyse the URL
          or domain without you visiting it:
        </p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li>
            <a
              href="https://www.virustotal.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              VirusTotal
            </a>
            <span className="text-muted-foreground">
              {' '}
              — scans URLs and files against multiple security engines
            </span>
          </li>
          <li>
            <a
              href="https://www.urlvoid.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              URLVoid
            </a>
            <span className="text-muted-foreground">
              {' '}
              — checks domains against blacklists and reputation databases
            </span>
          </li>
        </ul>
      </section>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <Search className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-900">Key takeaway</p>
            <p className="mt-1 text-sm text-emerald-800">
              A one-second hover check before clicking is the single most effective habit
              for catching phishing links. If the destination URL doesn't match what you
              expect, don't proceed — verify through an external tool or navigate
              directly to the site you intended to visit.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
