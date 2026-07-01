import TestRenderer, { act } from 'react-test-renderer';
import { TrustBadge } from '../TrustBadge';

/** Collect every string rendered anywhere in the tree. */
function collectText(node, acc = []) {
  if (node == null) return acc;
  if (typeof node === 'string') {
    acc.push(node);
    return acc;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, acc));
    return acc;
  }
  if (node.children) collectText(node.children, acc);
  return acc;
}

function renderText(element) {
  let tree;
  act(() => {
    tree = TestRenderer.create(element);
  });
  return collectText(tree.toJSON()).join(' ');
}

describe('TrustBadge', () => {
  it('shows the tier label derived from a high score', () => {
    expect(renderText(<TrustBadge score={850} />)).toContain('Trusted');
  });

  it('shows the danger label derived from a low score', () => {
    expect(renderText(<TrustBadge score={120} />)).toContain('High risk');
  });

  it('renders a custom label when provided', () => {
    expect(renderText(<TrustBadge score={120} label="HIGH RISK" />)).toContain('HIGH RISK');
  });

  it('supports a forced tier with a custom label', () => {
    expect(renderText(<TrustBadge tier="safe" label="Resolved" />)).toContain('Resolved');
  });
});
