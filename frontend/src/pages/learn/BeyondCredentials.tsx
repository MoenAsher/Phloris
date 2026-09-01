import { Download, FileWarning, DollarSign, ShieldX } from 'lucide-react'

export function BeyondCredentials() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Phishing is often described as credential theft. But clicking a link or opening
        an attachment can cause significant harm even when no login screen ever appears.
      </p>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Download className="h-4 w-4 text-rose-500" />
          Drive-by malware and ransomware
        </h2>
        <p className="text-sm text-muted-foreground">
          A malicious link can trigger a drive-by download — installing software in the
          background without any visible prompt. This is a common delivery method for
          ransomware (which encrypts your files and demands payment) and remote-access
          tools that give attackers persistent access to your system.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileWarning className="h-4 w-4 text-amber-500" />
          Malicious document macros
        </h2>
        <p className="text-sm text-muted-foreground">
          Office documents (.docx, .xlsm, .pptm) can contain macros — scripts that
          execute automatically or when an "Enable Editing" or "Enable Content" prompt is
          accepted. Clicking that prompt in an unexpected document is a common way
          banking trojans and ransomware are installed. No credentials are ever requested.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <DollarSign className="h-4 w-4 text-violet-500" />
          Business email compromise and payment fraud
        </h2>
        <p className="text-sm text-muted-foreground">
          Some phishing aims not for credentials but for a human action: a finance team
          member receives a convincing impersonation of a manager or supplier and is
          directed to change a payment account or authorise a transfer. The damage is
          financial rather than technical, and no systems need to be compromised.
        </p>
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">Key takeaway</p>
            <p className="mt-1 text-sm text-amber-800">
              "I didn't enter a password" does not mean "nothing happened." If you clicked
              a link, opened an attachment, or accepted a macro prompt in response to an
              unexpected email, treat it as a potential security incident and report it
              regardless of what appeared on screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
