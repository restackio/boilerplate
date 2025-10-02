# """GitHub Pull Request Creation API Sample
# Source: https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28
# """

GITHUB_PR_CREATION_SAMPLE = {
    "id": 1347,
    "node_id": "PR_kwDOABCD1234567890",
    "number": 123,
    "state": "open",
    "locked": False,
    "title": "Fix database connection timeout in payment service",
    "body": "This PR addresses the database connection timeout issues identified in Linear issue ENG-123.\n\nChanges:\n- Increased connection timeout from 30s to 60s\n- Added connection retry logic\n- Improved error handling and logging\n\nFixes: ENG-123",
    "user": {
        "login": "engineering-bot",
        "id": 12345,
        "node_id": "U_kgDOABCD1234567890",
        "avatar_url": "https://avatars.githubusercontent.com/u/12345?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/engineering-bot",
        "html_url": "https://github.com/engineering-bot",
        "type": "User",
        "site_admin": False,
    },
    "labels": [
        {
            "id": 11111,
            "node_id": "LA_kwDOABCD1234567890",
            "url": "https://api.github.com/repos/company/repo/labels/bug",
            "name": "bug",
            "description": "Something isn't working",
            "color": "d73a4a",
            "default": True,
        },
        {
            "id": 22222,
            "node_id": "LA_kwDOABCD0987654321",
            "url": "https://api.github.com/repos/company/repo/labels/database",
            "name": "database",
            "description": "Database related changes",
            "color": "0366d6",
            "default": False,
        },
    ],
    "milestone": {
        "url": "https://api.github.com/repos/company/repo/milestones/1",
        "html_url": "https://github.com/company/repo/milestone/1",
        "labels_url": "https://api.github.com/repos/company/repo/milestones/1/labels",
        "id": 1002604,
        "node_id": "MI_kwDOABCD1234567890",
        "number": 1,
        "state": "open",
        "title": "Q1 Infrastructure",
        "description": "Q1 infrastructure improvements and bug fixes",
        "creator": {
            "login": "project-manager",
            "id": 54321,
            "type": "User",
        },
        "open_issues": 4,
        "closed_issues": 8,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "closed_at": None,
        "due_on": "2024-03-31T23:59:59Z",
    },
    "active_lock_reason": None,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "closed_at": None,
    "merged_at": None,
    "merge_commit_sha": None,
    "assignee": {
        "login": "jane-smith",
        "id": 67890,
        "type": "User",
    },
    "assignees": [
        {"login": "jane-smith", "id": 67890, "type": "User"}
    ],
    "requested_reviewers": [
        {"login": "senior-dev", "id": 98765, "type": "User"}
    ],
    "requested_teams": [
        {
            "id": 1,
            "node_id": "T_kwDOABCD1234567890",
            "name": "engineering",
            "slug": "engineering",
            "description": "Engineering team",
            "privacy": "closed",
            "permission": "admin",
            "url": "https://api.github.com/teams/1",
            "html_url": "https://github.com/orgs/company/teams/engineering",
        }
    ],
    "head": {
        "label": "company:fix-db-timeout",
        "ref": "fix-db-timeout",
        "sha": "6dcb09b5b57875f334f61aebed695e2e4193db5e",
        "user": {
            "login": "company",
            "id": 11111,
            "type": "Organization",
        },
        "repo": {
            "id": 1296269,
            "node_id": "R_kgDOABCD1234567890",
            "name": "payment-service",
            "full_name": "company/payment-service",
            "private": True,
            "owner": {
                "login": "company",
                "id": 11111,
                "type": "Organization",
            },
        },
    },
    "base": {
        "label": "company:main",
        "ref": "main",
        "sha": "6dcb09b5b57875f334f61aebed695e2e4193db5e",
        "user": {
            "login": "company",
            "id": 11111,
            "type": "Organization",
        },
        "repo": {
            "id": 1296269,
            "node_id": "R_kgDOABCD1234567890",
            "name": "payment-service",
            "full_name": "company/payment-service",
            "private": True,
        },
    },
    "_links": {
        "self": {
            "href": "https://api.github.com/repos/company/payment-service/pulls/123"
        },
        "html": {
            "href": "https://github.com/company/payment-service/pull/123"
        },
        "issue": {
            "href": "https://api.github.com/repos/company/payment-service/issues/123"
        },
        "comments": {
            "href": "https://api.github.com/repos/company/payment-service/issues/123/comments"
        },
        "review_comments": {
            "href": "https://api.github.com/repos/company/payment-service/pulls/123/comments"
        },
        "review_comment": {
            "href": "https://api.github.com/repos/company/payment-service/pulls/comments{/number}"
        },
        "commits": {
            "href": "https://api.github.com/repos/company/payment-service/pulls/123/commits"
        },
        "statuses": {
            "href": "https://api.github.com/repos/company/payment-service/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e"
        },
    },
    "author_association": "OWNER",
    "auto_merge": None,
    "draft": False,
    "merged": False,
    "mergeable": True,
    "rebaseable": True,
    "mergeable_state": "clean",
    "merged_by": None,
    "comments": 0,
    "review_comments": 0,
    "maintainer_can_modify": False,
    "commits": 1,
    "additions": 45,
    "deletions": 8,
    "changed_files": 3,
}
