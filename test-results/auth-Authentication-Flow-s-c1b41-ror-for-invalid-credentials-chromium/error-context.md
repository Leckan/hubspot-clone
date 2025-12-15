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
          - textbox "Email" [disabled]:
            - /placeholder: Enter your email
            - text: invalid@example.com
        - generic [ref=e11]:
          - generic [ref=e12]: Password
          - textbox "Password" [disabled]:
            - /placeholder: Enter your password
            - text: wrongpassword
        - button "Signing in..." [disabled]
      - paragraph [ref=e14]:
        - text: Don't have an account?
        - link "Sign up" [ref=e15] [cursor=pointer]:
          - /url: /auth/register
  - region "Notifications alt+T"
  - alert [ref=e16]
```