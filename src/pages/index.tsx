import { Illustration } from '../components/Home/Illustration';
import { SignInForm } from '../components/Home/SignInForm';

import styles from '../styles/Home.module.css';

function Home() {
  return (
    <div className={styles.container}>
      <SignInForm />
      <Illustration />
    </div>
  );
}
export default Home;
