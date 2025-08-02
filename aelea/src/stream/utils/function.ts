export function compose<A, B, C>(f: (a: A) => B, g: (b: B) => C) {
  return (x: A): C => g(f(x))
}

/**
 * Pipe operator for functional composition.
 * Manually unrolled for performance optimization up to 12 arguments.
 * Falls back to loop for more than 12 arguments.
 */
export const op: Op = (a: any, ...args: readonly any[]) => {
  switch (args.length) {
    case 0:
      return a
    case 1:
      return args[0](a)
    case 2:
      return args[1](args[0](a))
    case 3:
      return args[2](args[1](args[0](a)))
    case 4:
      return args[3](args[2](args[1](args[0](a))))
    case 5:
      return args[4](args[3](args[2](args[1](args[0](a)))))
    case 6:
      return args[5](args[4](args[3](args[2](args[1](args[0](a))))))
    case 7:
      return args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))
    case 8:
      return args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a))))))))
    case 9:
      return args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))
    case 10:
      return args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a))))))))))
    case 11:
      return args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))))
    case 12:
      return args[11](
        args[10](args[9](args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](a)))))))))))
      )
    default: {
      let ret = a
      for (let i = 0; i < args.length; i++) ret = args[i](ret)
      return ret
    }
  }
}

export interface Op {
  <A>(a: A): A
  <A, B>(a: A, ab: (_: A) => B): B
  <A, B, C>(a: A, ab: (_: A) => B, bc: (_: B) => C): C
  <A, B, C, D>(a: A, ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D): D
  <A, B, C, D, E>(a: A, ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D, de: (_: D) => E): E
  <A, B, C, D, E, F>(a: A, ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D, de: (_: D) => E, ef: (_: E) => F): F
  <A, B, C, D, E, F, G>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G
  ): G
  <A, B, C, D, E, F, G, H>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H
  ): H
  <A, B, C, D, E, F, G, H, I>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I
  ): I
  <A, B, C, D, E, F, G, H, I, J>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J
  ): J
  <A, B, C, D, E, F, G, H, I, J, K>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K
  ): K
  <A, B, C, D, E, F, G, H, I, J, K, L>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L
  ): L
  <A, B, C, D, E, F, G, H, I, J, K, L, M>(
    a: A,
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M
  ): M
}

export interface Curried2<A, B, C> {
  (): Curried2<A, B, C>
  (a: A, b: B): C
  (a: A): (b: B) => C
}

export function curry2<A, B, C>(f: (a: A, b: B) => C): Curried2<A, B, C> {
  function curried(...args: [] | [A] | [A, B]): any {
    switch (args.length) {
      case 0:
        return curried
      case 1:
        return (b: B) => f(args[0], b)
      default:
        return f(args[0], args[1])
    }
  }
  return curried as any
}

export interface Curried3<A, B, C, D> {
  (): Curried3<A, B, C, D>
  (a: A): Curried2<B, C, D>
  (a: A, b: B): (c: C) => D
  (a: A, b: B, c: C): D
}

export function curry3<A, B, C, D>(f: (a: A, b: B, c: C) => D): Curried3<A, B, C, D> {
  function curried(...args: [] | [A] | [A, B] | [A, B, C]): any {
    switch (args.length) {
      case 0:
        return curried
      case 1:
        return curry2((b: B, c: C) => f(args[0], b, c))
      case 2:
        return (c: C) => f(args[0], args[1], c)
      default:
        return f(args[0], args[1], args[2])
    }
  }
  return curried as any
}

export interface Curried4<A, B, C, D, E> {
  (): Curried4<A, B, C, D, E>
  (a: A): Curried3<B, C, D, E>
  (a: A, b: B): Curried2<C, D, E>
  (a: A, b: B, c: C): (d: D) => E
  (a: A, b: B, c: C, d: D): E
}

export function curry4<A, B, C, D, E>(f: (a: A, b: B, c: C, d: D) => E): Curried4<A, B, C, D, E> {
  function curried(...args: [] | [A] | [A, B] | [A, B, C] | [A, B, C, D]): any {
    switch (args.length) {
      case 0:
        return curried
      case 1:
        return curry3((b: B, c: C, d: D) => f(args[0], b, c, d))
      case 2:
        return curry2((c: C, d: D) => f(args[0], args[1], c, d))
      case 3:
        return (d: D) => f(args[0], args[1], args[2], d)
      default:
        return f(args[0], args[1], args[2], args[3])
    }
  }
  return curried as any
}

/**
 * Function composition operator.
 * Composes functions from left to right for later application.
 * o(f, g, h)(x) === h(g(f(x)))
 */
export const o: O = (...fns: readonly any[]) => {
  switch (fns.length) {
    case 0:
      return (x: any) => x
    case 1:
      return fns[0]
    case 2:
      return (x: any) => fns[1](fns[0](x))
    case 3:
      return (x: any) => fns[2](fns[1](fns[0](x)))
    case 4:
      return (x: any) => fns[3](fns[2](fns[1](fns[0](x))))
    case 5:
      return (x: any) => fns[4](fns[3](fns[2](fns[1](fns[0](x)))))
    case 6:
      return (x: any) => fns[5](fns[4](fns[3](fns[2](fns[1](fns[0](x))))))
    case 7:
      return (x: any) => fns[6](fns[5](fns[4](fns[3](fns[2](fns[1](fns[0](x)))))))
    case 8:
      return (x: any) => fns[7](fns[6](fns[5](fns[4](fns[3](fns[2](fns[1](fns[0](x))))))))
    case 9:
      return (x: any) => fns[8](fns[7](fns[6](fns[5](fns[4](fns[3](fns[2](fns[1](fns[0](x)))))))))
    case 10:
      return (x: any) => fns[9](fns[8](fns[7](fns[6](fns[5](fns[4](fns[3](fns[2](fns[1](fns[0](x))))))))))
    case 11:
      return (x: any) => fns[10](fns[9](fns[8](fns[7](fns[6](fns[5](fns[4](fns[3](fns[2](fns[1](fns[0](x)))))))))))
    case 12:
      return (x: any) =>
        fns[11](fns[10](fns[9](fns[8](fns[7](fns[6](fns[5](fns[4](fns[3](fns[2](fns[1](fns[0](x))))))))))))
    default:
      return (x: any) => {
        let ret = x
        for (let i = 0; i < fns.length; i++) ret = fns[i](ret)
        return ret
      }
  }
}

export interface O {
  (): <A>(a: A) => A
  <A, B>(ab: (_: A) => B): (_: A) => B
  <A, B, C>(ab: (_: A) => B, bc: (_: B) => C): (_: A) => C
  <A, B, C, D>(ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D): (_: A) => D
  <A, B, C, D, E>(ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D, de: (_: D) => E): (_: A) => E
  <A, B, C, D, E, F>(ab: (_: A) => B, bc: (_: B) => C, cd: (_: C) => D, de: (_: D) => E, ef: (_: E) => F): (_: A) => F
  <A, B, C, D, E, F, G>(
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G
  ): (_: A) => G
  <A, B, C, D, E, F, G, H>(
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H
  ): (_: A) => H
  <A, B, C, D, E, F, G, H, I>(
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I
  ): (_: A) => I
  <A, B, C, D, E, F, G, H, I, J>(
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J
  ): (_: A) => J
  <A, B, C, D, E, F, G, H, I, J, K>(
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K
  ): (_: A) => K
  <A, B, C, D, E, F, G, H, I, J, K, L>(
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L
  ): (_: A) => L
  <A, B, C, D, E, F, G, H, I, J, K, L, M>(
    ab: (_: A) => B,
    bc: (_: B) => C,
    cd: (_: C) => D,
    de: (_: D) => E,
    ef: (_: E) => F,
    fg: (_: F) => G,
    gh: (_: G) => H,
    hi: (_: H) => I,
    ij: (_: I) => J,
    jk: (_: J) => K,
    kl: (_: K) => L,
    lm: (_: L) => M
  ): (_: A) => M
}
