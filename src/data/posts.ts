export interface Post {
  id: string;
  title: string;
  slug: string;
  category: 'influencies' | 'perspectives' | 'vivencies';
  image: {
    url: string;
    title: string;
  };
  keywords: string[];
  date: string;
}

export const posts: Post[] = [
  {
    id: '001',
    title: 'La llum en la fotografia documental',
    slug: 'llum-fotografia-documental',
    category: 'influencies',
    image: {
      url: 'https://placehold.co/600x400',
      title: 'Estudi de llum natural, Barcelona 1985',
    },
    keywords: ['llum', 'documentalisme', 'tècnica'],
    date: '2024-02-07',
  },
  {
    id: '002',
    title: "L'evolució de la càmera digital",
    slug: 'evolucio-camera-digital',
    category: 'perspectives',
    image: {
      url: 'https://placehold.co/600x400',
      title: 'Primera càmera digital professional, 1990',
    },
    keywords: ['tecnologia', 'història', 'digital'],
    date: '2024-02-06',
  },
  {
    id: '003',
    title: "Memòries d'un fotògraf de carrer",
    slug: 'memories-fotograf-carrer',
    category: 'vivencies',
    image: {
      url: 'https://placehold.co/600x400',
      title: 'Carrer del Raval, Barcelona 1988',
    },
    keywords: ['street photography', 'Barcelona', 'història'],
    date: '2024-02-05',
  },
];
