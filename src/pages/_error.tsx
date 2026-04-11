import { NextPageContext } from 'next';

function Error({ statusCode }: { statusCode: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 700, color: '#1e293b' }}>{statusCode}</h1>
      <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
        {statusCode === 404 ? '페이지를 찾을 수 없습니다' : '서버 오류가 발생했습니다'}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
