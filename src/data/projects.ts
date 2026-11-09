import ryLogo from '../assets/images/projects/ry-logo.webp';
import starlingLogo from '../assets/images/projects/starling-logo.webp';
import janusLogo from '../assets/images/projects/janus-logo.webp';
import huerdLogo from '../assets/images/projects/huerd-logo.png';
import hrvesterLogo from '../assets/images/projects/hrvester-logo.png';

/** Software I have built, in the order it should be shown: newest first. */
export const projects = [
  {
    title: 'ry — Static Checker for R',
    description:
      'Catch type errors, missing data frame columns, and scope issues before running R code.',
    year: 2026,
    status: 'Active',
    banner: ryLogo,
    tech: ['Rust', 'R'],
    links: [
      { type: 'GitHub', url: 'https://github.com/sims1253/ry' },
      { type: 'Docs', url: 'https://github.com/sims1253/ry#readme' },
    ],
  },
  {
    title: 'Starling — Local Speech Recognition',
    description:
      'Transcribe speech locally with a native inference engine and apps for desktop and phone.',
    year: 2026,
    status: 'Active',
    banner: starlingLogo,
    tech: ['C++', 'ggml', 'TypeScript'],
    links: [
      { type: 'GitHub', url: 'https://github.com/sims1253/starling' },
      { type: 'Docs', url: 'https://github.com/sims1253/starling#readme' },
    ],
  },
  {
    title: 'Janus — Structured PDF Extraction',
    description:
      'Extract data from PDF text and layout locally, inspect source locations, and compare with reference data.',
    year: 2026,
    status: 'Active',
    banner: janusLogo,
    tech: ['Python', 'PDF'],
    links: [
      { type: 'GitHub', url: 'https://github.com/sims1253/nebu/tree/main/janus' },
      { type: 'Docs', url: 'https://github.com/sims1253/nebu/tree/main/janus#readme' },
    ],
  },
  {
    title: 'huerd — Herding Hues',
    description: 'Perceptually distinct color palettes optimized for accessibility in OKLAB (R).',
    year: 2024,
    status: 'Active',
    banner: huerdLogo,
    tech: ['R', 'OKLAB', 'nloptr'],
    links: [
      { type: 'GitHub', url: 'https://github.com/sims1253/huerd' },
      { type: 'Docs', url: 'https://github.com/sims1253/huerd#readme' },
    ],
  },
  {
    title: 'hrvester — Heart Rate Variability Toolkit',
    description: 'Analyze HRV data with robust preprocessing and recovery scoring.',
    year: 2024,
    status: 'Active',
    banner: hrvesterLogo,
    tech: ['R', 'Signal Processing'],
    links: [
      { type: 'GitHub', url: 'https://github.com/sims1253/hrvester' },
      { type: 'Docs', url: 'https://github.com/sims1253/hrvester#readme' },
    ],
  },
].sort((a, b) => b.year - a.year);

/** "ry — Static Checker for R" is a name and what the thing is. */
export const projectName = (title: string) => {
  const [name = title, common] = title.split(' — ');
  return { name, common };
};
