import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const DisableBackorderList = () => {
  useEffect(() => {
    function processNode(node: Node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const el = node as HTMLElement

      const textContainers = el.querySelectorAll("label, span, p, button")
      textContainers.forEach((item) => {
        const text = (item.textContent || "").trim().toLowerCase()
        if (text === "allow backorders" || text === "allow backorder" || text === "backorder") {
          const container = item.closest("div.flex, div.grid, label")
          if (container) {
            (container as HTMLElement).style.setProperty("display", "none", "important")
            const controls = container.querySelectorAll("button[role='switch'], input[type='checkbox']")
            controls.forEach((ctrl) => {
              ctrl.setAttribute("disabled", "true")
              if (ctrl.getAttribute("aria-checked") === "true") {
                (ctrl as HTMLElement).click()
              }
              if (ctrl instanceof HTMLInputElement && ctrl.checked) {
                ctrl.checked = false
                ctrl.dispatchEvent(new Event("change", { bubbles: true }))
              }
            })
          }
        }
      })
    }

    processNode(document.body)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          processNode(node)
        })
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: "product.list.after",
})

export default DisableBackorderList
