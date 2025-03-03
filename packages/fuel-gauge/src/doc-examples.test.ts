import { generateTestWallet, seedTestWallet } from '@fuel-ts/account/test-utils';
import type {
  BN,
  Bech32Address,
  BigNumberish,
  Bytes,
  CoinQuantity,
  JsonAbi,
  WalletLocked,
} from 'fuels';
import {
  Predicate,
  bn,
  Provider,
  hashMessage,
  Address,
  arrayify,
  hexlify,
  randomBytes,
  getRandomB256,
  addressify,
  Contract,
  Wallet,
  WalletUnlocked,
  Signer,
  ZeroBytes32,
  BaseAssetId,
  FUEL_NETWORK_URL,
  FUEL_BETA_5_NETWORK_URL,
} from 'fuels';

import { FuelGaugeProjectsEnum, getFuelGaugeForcProject } from '../test/fixtures';

const { abiContents: callTestAbi } = getFuelGaugeForcProject(
  FuelGaugeProjectsEnum.CALL_TEST_CONTRACT
);

const { binHexlified: predicateTriple } = getFuelGaugeForcProject(
  FuelGaugeProjectsEnum.PREDICATE_TRIPLE_SIG
);

const { binHexlified: testPredicateTrue } = getFuelGaugeForcProject(
  FuelGaugeProjectsEnum.PREDICATE_TRUE
);

const PUBLIC_KEY =
  '0x2f34bc0df4db0ec391792cedb05768832b49b1aa3a2dd8c30054d1af00f67d00b74b7acbbf3087c8e0b1a4c343db50aa471d21f278ff5ce09f07795d541fb47e';

const ADDRESS_B256 = '0xf1e92c42b90934aa6372e30bc568a326f6e66a1a0288595e6e3fbd392a4f3e6e';

const ADDRESS_BECH32: Bech32Address =
  'fuel1785jcs4epy625cmjuv9u269rymmwv6s6q2y9jhnw877nj2j08ehqce3rxf';

const ADDRESS_BYTES = new Uint8Array([
  241, 233, 44, 66, 185, 9, 52, 170, 99, 114, 227, 11, 197, 104, 163, 38, 246, 230, 106, 26, 2, 136,
  89, 94, 110, 63, 189, 57, 42, 79, 62, 110,
]);

/**
 * @group node
 */
describe('Doc Examples', () => {
  let gasPrice: BN;

  beforeAll(async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    ({ minGasPrice: gasPrice } = provider.getGasConfig());
  });
  test('it has an Address class using bech32Address', () => {
    const address = new Address(ADDRESS_BECH32);

    expect(address.toB256()).toEqual(ADDRESS_B256);
    expect(address.toBytes()).toEqual(ADDRESS_BYTES);
    expect(address.toHexString()).toEqual(ADDRESS_B256);
  });

  test('it has an Address class using public key', () => {
    const address = Address.fromPublicKey(PUBLIC_KEY);

    expect(address.toAddress()).toEqual(ADDRESS_BECH32);
    expect(address.toB256()).toEqual(ADDRESS_B256);
  });

  test('it has an Address class using b256Address', () => {
    const address = Address.fromB256(ADDRESS_B256);

    expect(address.toAddress()).toEqual(ADDRESS_BECH32);
    expect(address.toB256()).toEqual(ADDRESS_B256);
  });

  test('it has Address tools', () => {
    // you can make a random address - useful for testing
    const address = Address.fromRandom();

    // you can it has a new Address from an ambiguous source that may be a Bech32 or B256 address
    const addressCloneFromBech = Address.fromString(address.toString());
    const addressCloneFromB256 = Address.fromString(address.toB256());

    // if you aren't sure where the address comes from, use fromDynamicInput
    const dataFromInput: string =
      '0xf1e92c42b90934aa6372e30bc568a326f6e66a1a0288595e6e3fbd392a4f3e6e';
    // if the input string can't be resolved this will throw an error
    const someAddress = Address.fromDynamicInput(dataFromInput);

    // you can verify equality using the helper functions
    expect(address.equals(addressCloneFromBech)).toBeTruthy();
    expect(addressCloneFromBech.toString()).toEqual(addressCloneFromB256.toString());
    expect(someAddress).toBeTruthy();
  });

  test('it has Bytes tools', () => {
    const random32Bytes: Bytes = randomBytes(32);
    const random32BytesString: string = hexlify(random32Bytes);
    const zeroed32Bytes: string = ZeroBytes32;

    expect(arrayify(random32Bytes)).toEqual(arrayify(random32BytesString));

    expect(zeroed32Bytes).toEqual(hexlify(zeroed32Bytes));
  });

  test('it has b256 tools', () => {
    const randomB256Bytes: Bytes = randomBytes(32);
    const randomB256: string = getRandomB256();

    const hexedB256: string = hexlify(randomB256Bytes);

    expect(arrayify(randomB256Bytes)).toEqual(arrayify(hexedB256));

    expect(randomB256).toEqual(hexlify(randomB256));
  });

  test('it has conversion tools', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);

    const assetId: string = ZeroBytes32;
    const randomB256Bytes: Bytes = randomBytes(32);
    const hexedB256: string = hexlify(randomB256Bytes);
    const address = Address.fromB256(hexedB256);
    const arrayB256: Uint8Array = arrayify(randomB256Bytes);
    const walletLike: WalletLocked = Wallet.fromAddress(address, provider);
    const contractLike: Contract = new Contract(address, callTestAbi, provider);

    expect(address.equals(addressify(walletLike) as Address)).toBeTruthy();
    expect(address.equals(contractLike.id as Address)).toBeTruthy();
    expect(address.toBytes()).toEqual(arrayB256);
    expect(address.toB256()).toEqual(hexedB256);
    expect(arrayify(address.toB256())).toEqual(arrayB256);

    expect(arrayify(assetId)).toEqual(arrayify(Address.fromB256(assetId).toB256()));
  });

  test('it can work with wallets', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    // #region wallets
    // #import { Wallet, WalletLocked, WalletUnlocked };

    // use the `generate` helper to make an Unlocked Wallet
    const myWallet: WalletUnlocked = Wallet.generate({
      provider,
    });

    // or use an Address to create a wallet
    const someWallet: WalletLocked = Wallet.fromAddress(myWallet.address, provider);
    // #endregion wallets

    const PRIVATE_KEY = myWallet.privateKey;

    // #region wallet-locked-to-unlocked
    const lockedWallet: WalletLocked = Wallet.fromAddress(myWallet.address, provider);
    // #region wallet-from-private-key
    // unlock an existing wallet
    let unlockedWallet: WalletUnlocked = lockedWallet.unlock(PRIVATE_KEY);
    // or directly from a private key
    unlockedWallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);
    // #endregion wallet-locked-to-unlocked
    // #endregion wallet-from-private-key

    // #region wallet-unlocked-to-locked
    const newlyLockedWallet = unlockedWallet.lock();
    // #endregion wallet-unlocked-to-locked

    // #region wallet-check-balance
    // #import { BigNumberish };
    const balance: BigNumberish = await myWallet.getBalance(BaseAssetId);
    // #endregion wallet-check-balance

    // #region wallet-check-balances
    // #import { CoinQuantity };
    const balances: CoinQuantity[] = await myWallet.getBalances();
    // #endregion wallet-check-balances

    expect(newlyLockedWallet.address).toEqual(someWallet.address);
    expect(balance).toBeTruthy();
    expect(balances.length).toEqual(0);
  });

  it('it can be created without a provider', async () => {
    // #region wallet-optional-provider
    // #context import { Wallet, WalletUnlocked } from 'fuels';

    // You can create a wallet, without a provider
    let unlockedWallet: WalletUnlocked = Wallet.generate();
    unlockedWallet = Wallet.fromPrivateKey(unlockedWallet.privateKey);

    // All non-provider dependent methods are available
    unlockedWallet.lock();

    // All provider dependent methods will throw
    await expect(() => unlockedWallet.getCoins()).rejects.toThrow(/Provider not set/);
    // #endregion wallet-optional-provider
  });

  it('it can work sign messages with wallets', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    // #region wallet-message-signing
    // #import { WalletUnlocked, hashMessage, Signer };

    const wallet = WalletUnlocked.generate({
      provider,
    });
    const message = 'doc-test-message';
    const signedMessage = await wallet.signMessage(message);
    const hashedMessage = hashMessage(message);
    const recoveredAddress = Signer.recoverAddress(hashedMessage, signedMessage);
    // #endregion wallet-message-signing
    expect(wallet.privateKey).toBeTruthy();
    expect(wallet.publicKey).toBeTruthy();
    expect(wallet.address).toEqual(recoveredAddress);
  });

  it('can create wallets', async () => {
    // #region wallet-setup
    // #import { Provider, bn, FUEL_NETWORK_URL, generateTestWallet };
    const provider = await Provider.create(FUEL_NETWORK_URL);
    const assetIdA = '0x0101010101010101010101010101010101010101010101010101010101010101';
    const assetIdB = '0x0202020202020202020202020202020202020202020202020202020202020202';

    // single asset
    const walletA = await generateTestWallet(provider, [[42, BaseAssetId]]);

    // multiple assets
    const walletB = await generateTestWallet(provider, [
      // [Amount, AssetId]
      [100, assetIdA],
      [200, assetIdB],
      [30, BaseAssetId],
    ]);

    // this wallet has no assets
    const walletC = await generateTestWallet(provider);

    // retrieve balances of wallets
    const walletABalances = await walletA.getBalances();
    const walletBBalances = await walletB.getBalances();
    const walletCBalances = await walletC.getBalances();

    // validate balances
    expect(walletABalances).toEqual([{ assetId: BaseAssetId, amount: bn(42) }]);
    expect(walletBBalances).toEqual([
      { assetId: BaseAssetId, amount: bn(30) },
      { assetId: assetIdA, amount: bn(100) },
      { assetId: assetIdB, amount: bn(200) },
    ]);
    expect(walletCBalances).toEqual([]);
    // #endregion wallet-setup
  });

  it('can connect to testnet', async () => {
    const provider = await Provider.create(FUEL_BETA_5_NETWORK_URL);
    const PRIVATE_KEY = 'a1447cd75accc6b71a976fd3401a1f6ce318d27ba660b0315ee6ac347bf39568';
    const wallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);

    // #region signer-address
    const signer = new Signer(PRIVATE_KEY);
    // validate address
    expect(wallet.address).toEqual(signer.address);
    // #endregion signer-address
  });

  it('can connect to a local provider', async () => {
    // #region provider-local
    // #import { Provider, WalletUnlocked, FUEL_NETWORK_URL };
    const localProvider = await Provider.create(FUEL_NETWORK_URL);
    // Setup a private key
    const PRIVATE_KEY = 'a1447cd75accc6b71a976fd3401a1f6ce318d27ba660b0315ee6ac347bf39568';

    // Create the wallet, passing provider
    const wallet: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY, localProvider);

    const signer = new Signer(PRIVATE_KEY);
    // validate address
    expect(wallet.address).toEqual(signer.address);
    // #endregion provider-local
  });

  it('can query address with wallets', async () => {
    // #region wallet-query
    // #import { Provider, FUEL_NETWORK_URL, generateTestWallet };
    const provider = await Provider.create(FUEL_NETWORK_URL);
    const assetIdA = '0x0101010101010101010101010101010101010101010101010101010101010101';

    const wallet = await generateTestWallet(provider, [
      [42, BaseAssetId],
      [100, assetIdA],
    ]);

    // get single coin
    const coin = await wallet.getCoins(BaseAssetId);

    // get all coins
    const coins = await wallet.getCoins();

    expect(coin.length).toEqual(1);
    expect(coin).toEqual([
      expect.objectContaining({
        assetId: BaseAssetId,
        amount: bn(42),
      }),
    ]);
    expect(coins).toEqual([
      expect.objectContaining({
        assetId: BaseAssetId,
        amount: bn(42),
      }),
      expect.objectContaining({
        assetId: assetIdA,
        amount: bn(100),
      }),
    ]);
    // #endregion wallet-query

    // #region wallet-get-balances
    const walletBalances = await wallet.getBalances();
    expect(walletBalances).toEqual([
      { assetId: BaseAssetId, amount: bn(42) },
      { assetId: assetIdA, amount: bn(100) },
    ]);
    // #endregion wallet-get-balances

    // #region wallet-get-spendable-resources
    const spendableResources = await wallet.getResourcesToSpend([
      { amount: 32, assetId: BaseAssetId, max: 42 },
      { amount: 50, assetId: assetIdA },
    ]);
    expect(spendableResources[0].amount).toEqual(bn(42));
    expect(spendableResources[1].amount).toEqual(bn(100));
    // #endregion wallet-get-spendable-resources
  });

  it('can create a predicate', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    const predicate = new Predicate({
      bytecode: testPredicateTrue,
      provider,
    });

    expect(predicate.address).toBeTruthy();
    expect(predicate.bytes).toEqual(arrayify(testPredicateTrue));
  });

  it('can create a predicate and use', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    // Setup a private key
    const PRIVATE_KEY_1 = '0x862512a2363db2b3a375c0d4bbbd27172180d89f23f2e259bac850ab02619301';
    const PRIVATE_KEY_2 = '0x37fa81c84ccd547c30c176b118d5cb892bdb113e8e80141f266519422ef9eefd';
    const PRIVATE_KEY_3 = '0x976e5c3fa620092c718d852ca703b6da9e3075b9f2ecb8ed42d9f746bf26aafb';

    // Create the wallets, passing provider
    const wallet1: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY_1, provider);
    const wallet2: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY_2, provider);
    const wallet3: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY_3, provider);
    const receiver = Wallet.generate({ provider });

    await seedTestWallet(wallet1, [{ assetId: BaseAssetId, amount: bn(1_000_000) }]);
    await seedTestWallet(wallet2, [{ assetId: BaseAssetId, amount: bn(2_000_000) }]);
    await seedTestWallet(wallet3, [{ assetId: BaseAssetId, amount: bn(300_000) }]);

    const AbiInputs: JsonAbi = {
      types: [
        {
          typeId: 0,
          type: 'bool',
          components: null,
          typeParameters: null,
        },
        {
          typeId: 1,
          type: 'struct B512',
          components: null,
          typeParameters: null,
        },
        {
          typeId: 2,
          type: '[_; 3]',
          components: [
            {
              name: '__array_element',
              type: 1,
              typeArguments: null,
            },
          ],

          typeParameters: null,
        },
      ],
      functions: [
        {
          inputs: [
            {
              name: 'data',
              type: 2,
              typeArguments: null,
            },
          ],
          name: 'main',
          output: {
            name: '',
            type: 0,
            typeArguments: null,
          },
          attributes: null,
        },
      ],
      loggedTypes: [],
      configurables: [],
    };
    const dataToSign = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const signature1 = await wallet1.signMessage(dataToSign);
    const signature2 = await wallet2.signMessage(dataToSign);
    const signature3 = await wallet3.signMessage(dataToSign);
    const signatures = [signature1, signature2, signature3];
    const predicate = new Predicate({
      bytecode: predicateTriple,
      provider,
      abi: AbiInputs,
      inputData: [signatures],
    });
    const amountToPredicate = 600_000;
    const amountToReceiver = 100;
    const initialPredicateBalance = await predicate.getBalance();

    const response = await wallet1.transfer(predicate.address, amountToPredicate, BaseAssetId, {
      gasPrice,
      gasLimit: 10_000,
    });
    await response.waitForResult();
    const predicateBalance = await predicate.getBalance();

    // assert that predicate address now has the expected amount to predicate
    expect(bn(predicateBalance)).toEqual(initialPredicateBalance.add(amountToPredicate));

    const depositOnPredicate = await wallet1.transfer(predicate.address, 1000, BaseAssetId, {
      gasPrice,
      gasLimit: 10_000,
    });
    // Wait for Transaction to succeed
    await depositOnPredicate.waitForResult();
    const updatedPredicateBalance = await predicate.getBalance();

    // assert that predicate address now has the updated expected amount to predicate
    expect(bn(updatedPredicateBalance)).toEqual(
      initialPredicateBalance.add(amountToPredicate).add(1000)
    );

    const tx = await predicate.transfer(receiver.address, amountToReceiver, BaseAssetId, {
      gasPrice,
      gasLimit: 10_000,
    });
    await tx.waitForResult();

    // check balances
    const finalPredicateBalance = await predicate.getBalance();
    const receiverBalance = await receiver.getBalance();

    // assert that predicate address now has a zero balance
    expect(bn(initialPredicateBalance).lte(finalPredicateBalance)).toBeTruthy();
    // assert that predicate funds now belong to the receiver
    expect(bn(receiverBalance).gte(bn(amountToReceiver))).toBeTruthy();
  });
});
