import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import style from './SignInForm.module.css';

export function SignInForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Auto sign in after successful registration
        await handleSignIn(e, true);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      setError('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent, skipLoading = false) => {
    e.preventDefault();
    if (!skipLoading) {
      setLoading(true);
      setError('');
    }

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      }
    } catch (error) {
      setError('An error occurred during sign in');
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  return (
    <div className={style.container}>
      <div className={style.signInForm}>
        <div className={style.header}>
          <h1 className={style.title}>Kanban</h1>
        </div>
        <div className={style.separator}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </div>
        
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className={style.form}>
          {isSignUp && (
            <div className={style.inputGroup}>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={style.input}
              />
            </div>
          )}
          
          <div className={style.inputGroup}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className={style.input}
            />
          </div>
          
          <div className={style.inputGroup}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              className={style.input}
            />
          </div>

          {error && <div className={style.error}>{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className={style.submitButton}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className={style.toggleMode}>
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => setIsSignUp(false)}
                className={style.linkButton}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button 
                type="button"
                onClick={() => setIsSignUp(true)}
                className={style.linkButton}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
