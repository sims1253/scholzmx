import ryLogo from '../assets/images/projects/ry-logo.webp';
import starlingLogo from '../assets/images/projects/starling-logo.webp';
import janusLogo from '../assets/images/projects/janus-logo.webp';
import huerdLogo from '../assets/images/projects/huerd-logo.png';
import hrvesterLogo from '../assets/images/projects/hrvester-logo.png';
// Each logo's relief, for the light on its sticker (scripts/make-print-reliefs.mjs).
import ryRelief from '../assets/images/projects/relief/ry.webp?url';
import starlingRelief from '../assets/images/projects/relief/starling.webp?url';
import janusRelief from '../assets/images/projects/relief/janus.webp?url';
import huerdRelief from '../assets/images/projects/relief/huerd.webp?url';
import hrvesterRelief from '../assets/images/projects/relief/hrvester.webp?url';

/** Software I have built, in the order it should be shown: newest first. */
export const projects = [
  {
    title: 'ry — Static Checker for R',
    description:
      'Catch type errors, missing data frame columns, and scope issues before running R code.',
    year: 2026,
    status: 'Active',
    banner: ryLogo,
    relief: ryRelief,
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
    relief: starlingRelief,
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
    relief: janusRelief,
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
    relief: huerdRelief,
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
    relief: hrvesterRelief,
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
