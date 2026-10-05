import Home from '@/components/home';

/* Page entièrement statique. Le paramètre `?open=project:muscu`, utilisé par
   les pages projet pour renvoyer vers l'OS, est lu côté client par <Home>. */
export default function Page() {
  return <Home />;
}
