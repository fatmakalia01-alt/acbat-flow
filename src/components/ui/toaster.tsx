import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export const Toaster = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function ToasterInner(props, ref) {
    const { toasts } = useToast();

    return React.createElement(
      "div",
      { ref: ref },
      React.createElement(
        ToastProvider,
        {
          children: [
            toasts.map(function ({ id, title, description, action, ...props }) {
              return React.createElement(
                Toast,
                { key: id, ...props },
                [
                  React.createElement("div", { className: "grid gap-1", key: "content" }, [
                    title && React.createElement(ToastTitle, { key: "title" }, title),
                    description && React.createElement(ToastDescription, { key: "description" }, description)
                  ]),
                  action,
                  React.createElement(ToastClose, { key: "close" })
                ]
              );
            }),
            React.createElement(ToastViewport, { key: "viewport" })
          ]
        }
      )
    );
  }
);

Toaster.displayName = "Toaster";
