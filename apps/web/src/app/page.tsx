export default function TypographyPage() {
  return (
    <div className="container mx-auto p-8 space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-4 font-grotesk text-primary">
          Typography Showcase
        </h1>
        <p className="text-muted-foreground font-geist">
          Testing the typography variables and colors from the globals.css theme.
        </p>
      </div>

      <div className="space-y-6 border p-6 rounded-lg bg-card text-card-foreground shadow-sm">
        <h2 className="text-2xl font-semibold border-b pb-2 font-grotesk">
          Font Families
        </h2>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1 font-jb-mono">
              Body (Geist) - Default
            </p>
            <p className="text-2xl font-geist">
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1 font-jb-mono">
              Headline (Space Grotesk)
            </p>
            <p className="text-2xl font-grotesk">
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground mb-1 font-jb-mono">
              Label (JetBrains Mono)
            </p>
            <p className="text-2xl font-jb-mono">
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 border p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold border-b pb-2 font-grotesk">
          Headings (Headline Font)
        </h2>
        <div className="space-y-4 font-grotesk">
          <h1 className="text-5xl font-extrabold tracking-tight">Heading 1</h1>
          <h2 className="text-4xl font-semibold tracking-tight">Heading 2</h2>
          <h3 className="text-3xl font-semibold tracking-tight">Heading 3</h3>
          <h4 className="text-2xl font-semibold tracking-tight">Heading 4</h4>
          <h5 className="text-xl font-semibold tracking-tight">Heading 5</h5>
          <h6 className="text-lg font-semibold tracking-tight">Heading 6</h6>
        </div>
      </div>

      <div className="space-y-6 border p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold border-b pb-2 font-grotesk">
          Colors & Text
        </h2>
        <div className="space-y-4 font-geist">
          <p className="text-primary font-medium">
            This text uses the primary color.
          </p>
          <p className="text-secondary-foreground bg-secondary inline-block px-2 py-1 rounded">
            This text uses the secondary color.
          </p>
          <p className="text-destructive font-medium">
            This text indicates a destructive action.
          </p>
          <p className="text-muted-foreground">
            This text is muted for less emphasis.
          </p>
        </div>
      </div>
    </div>
  );
}