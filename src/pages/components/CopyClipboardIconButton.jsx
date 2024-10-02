import { Box, Button, Popover, StatusIndicator } from "@cloudscape-design/components";
import React, { useState } from "react";

const CopyClipboardIconButton = ({ content, children }) => {
    const [status, setStatus] = useState({ type: "", text: "" });
    return (
        <span>
            <Box margin={{ right: "xxs" }} display="inline-block">
                <Popover
                    size="small"
                    position="top"
                    triggerType="custom"
                    dismissButton={false}
                    content={<StatusIndicator type={status.type}>{status.text}</StatusIndicator>}
                >
                    <Button
                        variant="inline-icon"
                        iconName="copy"
                        onClick={() => {
                            navigator.clipboard
                                .writeText(content)
                                .then(() => setStatus({ type: "success", text: "copied" }))
                                .catch(() => setStatus({ type: "error", text: "copy failed" }));
                        }}
                    />
                </Popover>
            </Box>
            {children ? children : content}
        </span>
    );
};

export default CopyClipboardIconButton;
