import React, { HTMLAttributes, useEffect } from 'react';
import Layout from '../components/layout';
import { graphql } from 'gatsby';
import RehypeReact from 'rehype-react';
import { InteractiveCodeBlock } from '../components/InteractiveCodeBlock/InteractiveCodeBlock';
import { CacheableLineTokens } from '../components/InteractiveCodeBlock/tokenizers';
import { useProgressiveTokenizer, ComposedTokenT } from '../hooks';
import { useDeferredRender } from '../hooks/useDeferredRender';
import { CheapCodeBlock } from '../components/CheapCodeBlock';
import { TypeScriptIdentifierToken } from '../components/InteractiveCodeBlock/TypeScriptIdentifierToken';
import 'katex/dist/katex.min.css';

export interface TokenContext {
  text: string;
  tokens: CacheableLineTokens<ComposedTokenT>[];
}

export interface PostProps {
  data: {
    markdownRemark: {
      htmlAst: any;
      frontmatter: {
        title: string;
      };
    };
  };
  pageContext: {
    codeBlocks: {
      [key: string]: TokenContext;
    };
  };
}

export const query = graphql`
  query($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      htmlAst,
      frontmatter {
        title
      }
    }
  }
`;

interface ProgressiveCodeBlockProps {
  fileName: string;
  initialValue: string;
  initialTokens: CacheableLineTokens<ComposedTokenT>[];
  onStartEditing: () => void;
}

function ProgressiveCodeBlock({
  fileName,
  initialValue,
  initialTokens,
  onStartEditing,
}: ProgressiveCodeBlockProps) {
  const { editable, tsEnv } = React.useContext(EditableContext);
  const tokenizer = useProgressiveTokenizer({
    initialTokens,
    editable,
    languageService: tsEnv && tsEnv.languageService,
    fileName,
  });
  const deferredCodeBlock = useDeferredRender(() => (
    <InteractiveCodeBlock
      className="tm-theme"
      initialValue={initialValue}
      tokenizer={tokenizer}
      readOnly={!editable}
      onClick={() => editable || onStartEditing()}
      onChange={value => tsEnv && tsEnv.updateFileFromText(fileName, value)}
      renderToken={(token, tokenProps) => (
        <EditableContext.Consumer>
          {({ tsEnv: innerTsEnv }) => {
            switch (token.type) {
              case 'tm':
                return (
                  <span
                    className={token.scopes.reduce((scopes, s) => `${scopes} ${s.split('.').join(' ')}`, '')}
                    {...tokenProps}
                  />
                );
              case 'ts':
                if (innerTsEnv) {
                  return (
                    <TypeScriptIdentifierToken
                      languageService={innerTsEnv.languageService}
                      sourceFileName={fileName}
                      position={token.sourcePosition}
                      {...tokenProps}
                    />
                  );
                }
              default:
                return <span {...tokenProps} />;
            }
          }}
        </EditableContext.Consumer>
      )}
    />
  ), { timeout: 1000 });

  return deferredCodeBlock || <CheapCodeBlock>{initialValue}</CheapCodeBlock>;
}

type VirtualTypeScriptEnvironment = import('../utils/typescript').VirtualTypeScriptEnvironment;
interface EditableContext {
  editable: boolean;
  tsEnv: VirtualTypeScriptEnvironment | undefined;
}

const EditableContext = React.createContext<EditableContext>({ editable: false, tsEnv: undefined });

function createRenderer(tokens: { [key: string]: TokenContext }, setEditable: (editable: boolean) => void) {
  const renderAst = new RehypeReact({
    createElement: (type, props, children) => {
      if (type === 'pre') {
        const codeChild: React.ReactElement<HTMLAttributes<HTMLElement>> = (children as any)[0];
        const id = codeChild.props.id!;
        const codeBlock = tokens[id];
        if (codeBlock) {
          return (
            <ProgressiveCodeBlock
              key={id}
              fileName={`/${id}.tsx`}
              initialTokens={codeBlock.tokens}
              initialValue={codeBlock.text}
              onStartEditing={() => setEditable(true)}
            />
          );
        }
      }
      return React.createElement(type, props, children);
    },
  }).Compiler;

  return renderAst;
}

function Post({ data, pageContext }: PostProps) {
  const post = data.markdownRemark;
  const [editable, setEditable] = React.useState(false);
  const [tsEnv, setTsEnv] = React.useState<VirtualTypeScriptEnvironment | undefined>(undefined);
  const renderAst = React.useMemo(() => createRenderer(pageContext.codeBlocks, setEditable), [pageContext.codeBlocks]);

  useEffect(() => {
    if (editable) {
      (async () => {
        const [ts, { createVirtualTypeScriptEnvironment }] = await Promise.all([
          await import('typescript'),
          await import('../utils/typescript'),
        ]);
        const sourceFiles = Object.keys(pageContext.codeBlocks).map(id => (
          ts.createSourceFile(`/${id}.tsx`, pageContext.codeBlocks[id].text, ts.ScriptTarget.ES2015, false)
        ));
        setTsEnv(createVirtualTypeScriptEnvironment(sourceFiles));
      })();
    }
    return () => {
      if (tsEnv) {
        tsEnv.languageService.dispose();
      }
    };
  }, [editable]);

  return (
    <Layout>
      <div>
        <h1>{post.frontmatter.title}</h1>
        <EditableContext.Provider value={{ editable, tsEnv }}>
          <div>{renderAst(data.markdownRemark.htmlAst)}</div>
        </EditableContext.Provider>
      </div>
    </Layout>
  );
}

Post.displayName = 'Post';
export default Post;
