# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Create account
      - generic [ref=e6]: Enter your information to create your account
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: Full Name
          - textbox "Full Name" [ref=e11]:
            - /placeholder: Enter your full name
        - generic [ref=e12]:
          - generic [ref=e13]: Email
          - textbox "Email" [ref=e14]:
            - /placeholder: Enter your email
        - generic [ref=e15]:
          - generic [ref=e16]: Organization ID
          - textbox "Organization ID" [ref=e17]:
            - /placeholder: Enter your organization ID
        - generic [ref=e18]:
          - generic [ref=e19]: Password
          - textbox "Password" [ref=e20]:
            - /placeholder: Enter your password
        - generic [ref=e21]:
          - generic [ref=e22]: Confirm Password
          - textbox "Confirm Password" [ref=e23]:
            - /placeholder: Confirm your password
        - button "Create account" [ref=e24]
      - paragraph [ref=e26]:
        - text: Already have an account?
        - link "Sign in" [ref=e27]:
          - /url: /auth/signin
  - region "Notifications alt+T"
  - alert [ref=e28]
```