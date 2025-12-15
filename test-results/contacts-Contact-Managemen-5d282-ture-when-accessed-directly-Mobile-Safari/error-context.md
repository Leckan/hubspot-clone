# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Sign in
      - generic [ref=e6]: Enter your credentials to access your account
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: Email
          - textbox "Email" [ref=e11]:
            - /placeholder: Enter your email
        - generic [ref=e12]:
          - generic [ref=e13]: Password
          - textbox "Password" [ref=e14]:
            - /placeholder: Enter your password
        - button "Sign in" [ref=e15]
      - paragraph [ref=e17]:
        - text: Don't have an account?
        - link "Sign up" [ref=e18]:
          - /url: /auth/register
  - region "Notifications alt+T"
  - alert [ref=e19]
```