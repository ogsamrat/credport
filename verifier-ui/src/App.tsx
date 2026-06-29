import { usePassport } from './hooks/usePassport.js';
import { useReveal } from './hooks/useReveal.js';
import { Nav } from './components/Nav.js';
import { Hero } from './components/Hero.js';
import { Console } from './components/Console.js';
import { HowItWorks, Why, Install, Docs, Closing, Footer } from './components/Sections.js';

export default function App() {
  const ctl = usePassport();
  useReveal([ctl.connected]);

  return (
    <>
      <Nav ctl={ctl} />
      <main>
        <Hero />
        <Console ctl={ctl} />
        <HowItWorks />
        <Why />
        <Install />
        <Docs />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
