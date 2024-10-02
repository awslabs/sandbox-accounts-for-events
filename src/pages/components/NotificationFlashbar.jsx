import { Flashbar, Button, ProgressBar } from "@cloudscape-design/components";
import { useDispatch, useSelector } from "react-redux";

const NotificationFlashbar = () => {
    const notification = useSelector((state) => state.notification);
    const dispatch = useDispatch();

    return (
        <Flashbar
            items={
                notification.visible
                    ? [
                          {
                              ...notification,
                              content: notification.hasProgressBar ? (
                                  <ProgressBar value={notification.progressPercent ?? 0} additionalInfo={notification.content} variant="flash" />
                              ) : notification.content,
                              action: notification.hasAction ? (
                                  <Button onClick={() => dispatch({ type: "logs/show" })}>Show logs...</Button>
                              ) : undefined,
                              onDismiss: () => dispatch({ type: "notification/dismiss" })
                          }
                      ]
                    : []
            }
        />
    );
};

export default NotificationFlashbar;
