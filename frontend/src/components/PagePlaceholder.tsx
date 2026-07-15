import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/** Shared stub for feature pages that are scaffolded but not yet implemented. */
export function PagePlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            This page is part of the app shell and will be built in a later step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Not implemented yet
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
