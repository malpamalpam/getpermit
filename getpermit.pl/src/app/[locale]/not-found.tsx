import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-7xl font-bold text-accent">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-primary">
        Strona nie znaleziona
      </h1>
      <p className="mt-2 max-w-md text-primary/65">
        Strona, której szukasz, nie istnieje lub została przeniesiona.
      </p>
      <Link href="/" className="mt-8">
        <Button variant="primary">Wróć na stronę główną</Button>
      </Link>
    </Container>
  );
}
