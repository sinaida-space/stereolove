# Web Audit

Last updated: May 16, 2026.

## Scope

This audit covers the public Stereolove site at:

```text
https://sinaida-space.github.io/stereolove/
```

## Findings and Actions

- Production deployment uses GitHub Pages over HTTPS.
- Vite is configured with `base: "/stereolove/"` for correct asset loading on the project URL.
- The site now opens with an onboarding screen that explains the artwork and asks the viewer to choose camera, mouse, or touch navigation.
- The site includes a persistent header with navigation to instructions, privacy policy, and the main Sinaida website before the artwork enters fullscreen.
- The site includes a mini footer with an all-rights-reserved notice and a link to `sinaida.eu`.
- The artwork can enter a full-screen experience mode that hides navigation, footer, cookie notice, and controls.
- Camera mode is opt-in and starts only after a user gesture.
- The privacy policy describes local camera processing, GitHub Pages hosting, MediaPipe third-party assets, and essential local storage.
- The cookie notice is limited to essential local storage and links to the privacy policy.
- Metadata includes page descriptions and canonical URLs.

## External Identity Reference

The privacy page links to `sinaida.eu` as the public contact and identity source for Sinaida Krivchenko. The source site lists Sinaida Krivchenko as a Prague-based visual artist and digital strategist, working globally, with Instagram and LinkedIn contact links.

## Remaining Manual Checks

- Test camera mode in a real browser with a physical webcam.
- Verify the final visual impression on a large monitor, because the artwork depends on perceived physical screen scale.
- If a dedicated business email is added to `sinaida.eu`, mirror it in the Stereolove privacy policy.
