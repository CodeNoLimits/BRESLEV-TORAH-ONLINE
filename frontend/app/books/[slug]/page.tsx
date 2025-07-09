import { BookPageClient } from './BookPageClient'

interface BookPageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  // Generate static params for common book slugs
  return [
    { slug: 'likutei-moharan' },
    { slug: 'chayei-moharan' },
    { slug: 'likutei-etzot' },
    { slug: 'likutei-tefilot' },
    { slug: 'sippurei-maasiyot' },
    { slug: 'sefer-hamidot' },
    { slug: 'shivchey-haran' },
    { slug: 'sichot-haran' },
    { slug: 'tzavaat-harivash' },
    { slug: 'tzofinat-paneach' },
    { slug: 'likutei-halakhot' },
    { slug: 'tikkun-haklali' },
  ]
}

export default function BookPage({ params }: BookPageProps) {
  return <BookPageClient params={params} />
}