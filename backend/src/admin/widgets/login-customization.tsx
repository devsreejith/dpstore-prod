import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const LoginCustomizationWidget = () => {
  useEffect(() => {
    // Function to safely replace text within text nodes
    const replaceText = () => {
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walk.nextNode())) {
        if (node.nodeValue) {
          if (node.nodeValue.includes("Welcome to Medusa")) {
            node.nodeValue = node.nodeValue.replace("Welcome to Medusa", "Dubai Police Store Admin");
          }
          if (node.nodeValue.includes("Continue with Email")) {
            node.nodeValue = node.nodeValue.replace("Continue with Email", "Login");
          }
        }
      }
    };

    // Run it immediately for the initial load
    replaceText();

    // Set up an observer to catch it if React re-renders or changes state
    const observer = new MutationObserver((mutations) => {
      // Only run if there are added nodes or character data changes
      // to avoid unnecessary traversals
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
