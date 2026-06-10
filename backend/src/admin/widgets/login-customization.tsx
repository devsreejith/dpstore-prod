import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const LoginCustomizationWidget = () => {
  useEffect(() => {
    // Function to replace the text
    const replaceText = () => {
      // 1. Replace the Title
      const titles = document.querySelectorAll("h1, h2");
      titles.forEach(title => {
        if (title.textContent && title.textContent.includes("Welcome to Medusa")) {
          title.textContent = "Dubai Police Store Admin";
        }
      });

      // 2. Replace the 'Continue with Email' button
      const buttons = document.querySelectorAll("button");
      buttons.forEach(button => {
        if (button.textContent && button.textContent.includes("Continue with Email")) {
          // If the button has a span inside (which Medusa UI often does), replace the text node
          // Or just replace the textContent entirely if it doesn't break the styling
          button.textContent = "Login";
        }
      });
    };

    // Run it immediately for the initial load
    replaceText();

    // Set up an observer to catch it if React re-renders or changes state
    const observer = new MutationObserver(() => {
      replaceText();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Run one more time after a short delay just in case of lazy loading
    const timer = setTimeout(replaceText, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return null;
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginCustomizationWidget
