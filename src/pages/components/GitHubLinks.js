import { Box, Header, Link } from "@cloudscape-design/components";

const GitHubLinks = () => (
    <Box>
        <Header variant="h3">General information</Header>
        <ul>
            <li>
                <b>Sandbox Accounts for Events</b> on GitHub
                <Link href="https://https://github.com/awslabs/sandbox-accounts-for-events" external/>
            </li>
            <li>
                <b>Disposable Cloud Environment<sup>TM</sup></b> on GitHub
                <Link href="https://github.com/Optum/dce" external/>
            </li>
        </ul>
    </Box>
);

export default GitHubLinks;
